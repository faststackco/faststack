import React, {Component} from 'react'
import {Link, Redirect} from 'react-router-dom'
import {observer} from 'mobx-react'
import validator from 'validator'
import pick from 'lodash.pick'
import {Helmet} from 'react-helmet'
import PropTypes from 'prop-types'
import Input from '../common/Input'
import Errors from '../common/Errors'

// TODO replace all the ugly inline validation with something better
/* eslint max-len: 0 */

@observer
export default class Signup extends Component {

  state = {
    number: null,
    cvc: null,
    exp_month: null,
    exp_year: null,
    errors: [],
    loading: false,
    redirectToReferrer: false,
  }

  static contextTypes = {
    user: PropTypes.object,
    stripe: PropTypes.object,
  }

  submit(e) {
    e.preventDefault()
    this.setState({loading: true, errors: []})

    let card = pick(this.state, ['number', 'cvc', 'exp_month', 'exp_year'])

    Stripe.card.createToken(card, (status, res) => {
      if (res.error) {
        this.setState({errors: [res.error], loading: false})
      } else {
        this.context.user.stripeToken = res.id
        this.context.user.signup().then(() => {
          return this.context.user.login()
        }).then(() => {
          return this.context.user.subscribe()
        }).then(() => {
          return this.context.user.login() // login again to refresh token
        }).then(() => {
          this.setState({redirectToReferrer: true})
        }).catch((res) => {
          this.setState({errors: res.errors, loading: false})
        })
      }
    })
  }

  render() {
    const {user} = this.context
    const {redirectToReferrer} = this.state
    const {from} = this.props.location.state || {from: {pathname: '/dashboard'}}

    if (redirectToReferrer) {
      return (
        <Redirect to={from}/>
      )
    }

    return (
      <div className="container section">
        <Helmet>
          <title>Sign Up - FastStack</title>
        </Helmet>

        <div className="columns is-centered">
          <div className="column is-4">
            <h1 className="title has-text-centered">Sign Up</h1>

            <form onSubmit={(e) => this.submit(e)}>
              <div className="field">
                <label className="label">Username</label>
                <Input onValid={(v) => user.name = v}
                  validate={(v) => validator.isAlphanumeric(v) && validator.isLength(v, {min: 4, max: 20})}
                  message="Must be alphanumeric and between 4 and 20 characters" />
              </div>

              <div className="field">
                <label className="label">Email</label>
                <Input onValid={(v) => user.email = v}
                  validate={(v) => validator.isEmail(v)}
                  message="Must be valid email address" />
              </div>

              <div className="field">
                <label className="label">Password</label>
                <Input onValid={(v) => user.password = v} type="password"
                  validate={(v) => validator.isLength(v, {min: 10, max: 128})}
                  message="Must be at least 10 characters" />
              </div>

              <div className="field">
                <label className="label">Plan</label>
                <div className="control">
                  <label className="radio">
                    <input type="radio" name="plan" value="basic"
                      checked={user.plan == 'basic'}
                      onChange={(ev) => user.plan = ev.target.value} />
                    Basic
                  </label>
                  <p className="help">For users with simple needs. Only $5 per month. </p>
                </div>
              </div>

              <div className="field">
                <div className="control">
                  <label className="radio">
                    <input type="radio" name="plan" value="standard"
                      checked={user.plan == 'standard'}
                      onChange={(ev) => user.plan = ev.target.value} />
                    Standard &nbsp;<span className="help is-primary">Free for 7 days</span>
                  </label>
                  <p className="help">For ambitious users. Only $10 per month.</p>
                </div>
              </div>

              <div className="field">
                <div className="control">
                  <label className="radio">
                    <input type="radio" name="plan" value="pro"
                      checked={user.plan == 'pro'}
                      onChange={(ev) => user.plan = ev.target.value} />
                    Pro
                  </label>
                  <p className="help">For users with exceptional requirements. Only $20 per month.</p>
                </div>
              </div>

              <div className="field">
                <label className="label">Credit Card</label>
                <Input onValid={(v) => this.setState({number: v})}
                  validate={(v) => validator.isCreditCard(v)}
                  placeholder="Number"
                  message="Must be valid credit card number" />
              </div>

              <div className="field is-grouped">
                <Input expanded="true"
                  onValid={(v) => this.setState({exp_month: v.split('/')[0], exp_year: v.split('/')[1]})}
                  validate={(v) => /^(0[1-9]|1[0-2])\/?([0-9]{4}|[0-9]{2})$/.test(v)}
                  placeholder="MM/YY"
                  message="Must be expiry date in the form MM/YY" />
                <Input expanded="true" onValid={(v) => this.setState({cvc: v})}
                  validate={(v) => validator.isInt(v) && validator.isLength(v, {min: 3, max: 3})}
                  placeholder="CVC"
                  message="Must be numeric card security code" />
              </div>

              <div className="field is-grouped">
                <p className="control">
                  <button className={'button is-primary ' + (this.state.loading ? 'is-loading' : '')}>Sign up</button>
                </p>
                <p className="control">
                  <Link className="button is-link" to="/login">Login</Link>
                </p>
              </div>
            </form>

            <br/>

            <Errors errors={this.state.errors}/>
          </div>
        </div>
      </div>
    )
  }
}


