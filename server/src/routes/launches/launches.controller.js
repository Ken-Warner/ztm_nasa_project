const { getAllLaunches, addNewLaunch, abortLaunch, existsLaunchWithId } = require('../../models/launches.model');
const {
  getPagination
} = require('../../services/query');

async function httpGetAllLaunches(req, res) {
  const { skip, limit } = getPagination(req.query);

  return res.status(200).json(await getAllLaunches(skip, limit));
}

function httpAddNewLaunch(req, res) {
  const launch = req.body;

  if (!launch.mission || !launch.launchDate || !launch.rocket || !launch.target) {
    return res.status(400).json({
      error: 'Missing required launch property',
    });
  }

  launch.launchDate = new Date(req.body.launchDate);
  if (isNaN(launch.launchDate)) {
    return res.status(400).json({
      error: "Invalid Launch Date",
    });
  }

  addNewLaunch(launch);
  return res.status(201).json(launch);
}

async function httpAbortLaunch(req, res) {
  const launchId = parseInt(req.params.id);
  const exists = await existsLaunchWithId(launchId);
  if (!exists) {
    return res.status(404).json({
      error: 'Launch not found'
    });
  }

  const aborted = await abortLaunch(launchId);

  if (aborted) {
    return res.status(200).json({
      ok: 'true',
    });
  } else {
    return res.status(400).json({
      error: 'An unexpected error has occurred.',
    });
  }
}

module.exports = {
  httpGetAllLaunches,
  httpAddNewLaunch,
  httpAbortLaunch,
};