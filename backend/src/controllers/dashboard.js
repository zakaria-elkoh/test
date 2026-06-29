const DashboardModel = require('../models/dashboard');

async function getStats(req, res, next) {
  try {
    const stats = await DashboardModel.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats };
