import {action} from 'mobx'
import Collection from './Collection'
import Terminal from './Terminal'

export default class Machines extends Collection {

  constructor(token) {
    super(process.env.MACHINESTACK_URL, token)
    this.update()
  }

  sessions = {}

  @action update() {
    return this.fetch('GET', '/machines')
      .then(({data}) => {
        this.items = data.map((i) => i.attributes)
      })
  }

  @action create(name, image) {
    let data = {
      type: 'machines',
      attributes: {
        name: name,
        image: image,
        driver: 'lxd',
      },
    }


    return this.fetch('POST', '/machines', JSON.stringify({data}))
      .then((_) => {
        this.items.push(data.attributes)
      })
  }

  @action delete(name) {
    return this.fetch('DELETE', `/machines/${name}`)
      .then((_) => {
        this.items.remove(this.name(name))
      })
  }

  @action session(name, width, height) {
    // TODO detect when session dies for good
    if (this.sessions[name]) {
      return Promise.resolve(this.sessions[name])
    }

    let data = {
      attributes: {
        name: name,
        // TODO detect term size in advance
        width: 80,
        height: 25,
      },
    }

    return this.fetch('POST', '/session', JSON.stringify({data}))
      .then(({data}) => {
        this.sessions[name] = new Terminal(data.id)
        return this.sessions[name]
      })
  }

}
