import deepEqual from 'deep-equal'
import { notify } from './misc'
import { config, connections, folderStatus, myID } from './actions'

//State change subscribsion

export function stateHandler({menu, store, st, tray, buildMenu, hasKey, stConfig, dir}){
  let previousState = store.getState()
  return () => {
    const newState = store.getState()

    if(!newState.connected){
      setTimeout(() => store.dispatch(myID(st)), 1000)
    }

    if(previousState.myID !== newState.myID)
      store.dispatch(config(newState.myID, st))

    if(!deepEqual(previousState.folders, newState.folders))
      store.dispatch(folderStatus(newState.folders, st))

    if(!deepEqual(previousState.devices, newState.devices))
      store.dispatch(connections(st))

    if(!deepEqual(newState, previousState)){
      menu = buildMenu({stConfig, hasKey, st, dir, ...newState})
      tray.setContextMenu(menu)
    }
    previousState = newState
  }
}

//Events from Syncthing API
export function events(st, store){
  //Listen for devices connecting
  st.on('deviceConnected', ({ id, addr }) => {
    const { name } = store.getState().devices.filter(device => device.deviceID == id)[0]
    notify(`Connected to ${name}`, `on ${addr}`)
    store.dispatch(connections(st))
  })
  //Listen for devices disconnecting
  st.on('deviceDisconnected', ({id}) => {
    const { name } = store.getState().devices.filter(device => device.deviceID == id)[0]
    notify(`${name} disconnected`, 'Syncing to this device is paused')
    store.dispatch(connections(st))
  })
  //Listen for errors
  st.on('error', () => {
    store.dispatch({ type: 'CONNECTION_ERROR' })
  })
  //Listen for folder state changes
  st.on('stateChanged', ({ folder, to }) => {
    const state = store.getState()
    switch (to) {
    case 'syncing':
      notify(`${folder} is Syncing`)
      store.dispatch(folderStatus(state.folders, st))
      break
    case 'error':
      notify(`${folder} has an Error`, 'click to see the error in the dashboard.')
      break
    case 'idle':
      store.dispatch(folderStatus(state.folders, st))
      break
    }
  })

  setInterval(() => store.dispatch(connections(st)), 2000)
}