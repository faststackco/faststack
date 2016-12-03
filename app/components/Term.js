import React, {Component} from 'react'
import Markdown from 'react-markdown'
import {hterm, lib} from 'hterm-umdjs'

hterm.defaultStorage = new lib.Storage.Memory()

export default class Term extends Component {

  componentDidMount() {
    // wait for DOM render
    requestAnimationFrame(() => {
      let term = new hterm.Terminal();
      term.decorate(this.termElem);

      term.prefs_.set('audible-bell-sound', '')
      term.prefs_.set('ctrl-c-copy', true);
      term.prefs_.set('use-default-window-copy', true);

      let ws = new WebSocket(`ws${location.protocol === 'https:' ? 's' : ''}://${location.host}/boxes/${this.props.params.podId}/exec`);

      ws.onmessage = (ev) => {
        term.io.print(ev.data)
      }

      function HTerm(argv) {
        this.io = argv.io.push();
      }

      HTerm.prototype.run = function() {
        this.io.onVTKeystroke = this.io.sendString = (str) => {
          ws.send(str)
        }
      }

      HTerm.prototype.sendString_ = function(str) {
        ws.send(str)
      };

      term.runCommandClass(HTerm);
    })
  }

  render() {
    return <div style={{height: '90%'}}>
      <section className="section" style={{height: '85%'}}>
        <div className="container" style={{height: '100%'}}>
          <div ref={(div) => { this.termElem = div; }} style={{position: 'relative', width: '100%', height: '100%'}}/>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="content has-text-centered">
            <p>
              <strong>Want more?</strong>{' '}
              <a href="http://www.vultr.com/?ref=7052736-3B">Sign up for Vultr</a>{' '}
              and get $20 credit for high speed virtual servers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  }
}