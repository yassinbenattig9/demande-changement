'use strict';

const auth = require('./auth');
const users = require('./users');
const demandes = require('./demandes');
const sujets = require('./sujets');
const approbations = require('./approbations');
const impacts = require('./impacts');
const plans = require('./plans');
const reunions = require('./reunions');
const diffusions = require('./diffusions');
const mailing = require('./mailing');
const history = require('./history');
const notifications = require('./notifications');
const referentiels = require('./referentiels');
const system = require('./system');
const stats = require('./stats');

module.exports = {
  ...auth,
  ...users,
  ...demandes,
  ...sujets,
  ...approbations,
  ...impacts,
  ...plans,
  ...reunions,
  ...diffusions,
  ...mailing,
  ...history,
  ...notifications,
  ...referentiels,
  ...system,
  ...stats,
};