const axios = require('axios');

const launches = require('./launches.mongo');
const planets = require('./planets.mongo');

const DEFAULT_FLIGHT_NUMBER = 100;
const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';

const launch = { //mappings to spacex data
  flightNumber: 100, //flight_number
  mission: 'Kepler Exploration X', //name
  rocket: 'Explorer IS1', //rocket.name
  launchDate: new Date('December 27, 2030'), //date_local
  target: 'Kepler-442 b', //not applicable
  customers: ['ZTM', 'NASA'], //payloads.customers for each payload
  upcoming: true, //upcoming
  success: true, //sucess
};

saveLaunch(launch);

async function populateLaunches() {
  const response = await axios.post(SPACEX_API_URL, {
    query: {},
    options: {
      pagination: false,
      populate: [
        {
          path: 'rocket',
          select: {
            name: 1
          }
        },
        {
          path: 'payloads',
          select: {
            customers: 1
          }
        }
      ]
    }
  });

  if (response.status !== 200) {
    console.log('Problem downloading launch data');
    throw new Error('Launch data download failed');
  }

  const launchDocs = response.data.docs;
  for (const launchDoc of launchDocs) {
    const payloads = launchDoc['payloads'];
    const customers = payloads.flatMap((payload) => {
      return payload['customers'];
    });

    const launch = {
      flightNumber: launchDoc['flight_number'],
      mission: launchDoc['name'],
      rocket: launchDoc['rocket']['name'],
      launchDate: launchDoc['date_local'],
      upcoming: launchDoc['upcoming'],
      success: launchDoc['success'],
      customers: customers
    }

    console.log(`${launch.flightNumber} ${launch.mission}`);

    await saveLaunch(launch);
  }
}

async function loadLaunchData() {
  console.log('Load launches data');

  const firstLaunch = await findLaunch({
    flightNumber: 1,
    rocket: 'Falcon 1',
    mission: 'FalconSat',
  });

  if (firstLaunch) {
    console.log('Launch data is already loaded');
  } else {
    await populateLaunches();
  }
}

async function findLaunch(filter) {
  return await launches.findOne(filter);
}

async function existsLaunchWithId(launchId) {
  return await findLaunch({
    flightNumber: launchId
  });
}

async function getLatestFlightNumber() {
  const latestLaunch = await launches
    .findOne({})
    .sort('-flightNumber');

  if (!latestLaunch)
    return DEFAULT_FLIGHT_NUMBER;
  else
    return latestLaunch.flightNumber;
}

async function getAllLaunches(skip, limit) {
  return await launches.find(
    {},
    { '__v': 0, '_id': 0 }
  )
  .sort({ flightNumber: 1 })
  .skip(skip)
  .limit(limit);
}

async function saveLaunch(launch) {
  await launches.findOneAndUpdate(
    {
      flightNumber: launch.flightNumber
    },
    launch,
    { upsert: true })
}

async function addNewLaunch(launch) {
  const planet = await planets.findOne({
    keplerName: launch.target
  });

  if (!planet) {
    throw new Error('No matching planet was found');
  }

  const newLaunch = Object.assign(launch, {
    customer: ['ZTM', 'NASA'],
    flightNumber: await getLatestFlightNumber() + 1,
  });

  await saveLaunch(newLaunch);
}

async function abortLaunch(launchId) {
  const aborted = await launches.updateOne(
    {
      flightNumber: launchId
    }, {
    upcoming: false,
    success: false,
  });
  return aborted.acknowledged === true && aborted.modifiedCount === 1;
}

module.exports = {
  getAllLaunches,
  loadLaunchData,
  addNewLaunch,
  abortLaunch,
  existsLaunchWithId
};