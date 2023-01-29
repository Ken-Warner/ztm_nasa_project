const fs = require('fs');
const { parse } = require('csv-parse');
const path = require('path');

const planets = require('./planets.mongo');

function isHabitablePlanet(planet) {
  return planet['koi_disposition'] === 'CONFIRMED'
    && planet['koi_insol'] > 0.36
    && planet['koi_insol'] < 1.11
    && planet['koi_prad'] < 1.6;
}


function loadPlanetsData() {
  return new Promise((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, '..', '..', 'data', 'kepler_data.csv'))
      .pipe(parse({
        comment: '#', //tell it how to parse the file
        columns: true,
      })) //connect fs stream to csv-parse stream: readable stream.pipe(writable stream)
      .on('data', async (data) => {
        if (isHabitablePlanet(data)) {
          savePlanet(data);
        }
      })
      .on('error', (err) => {
        console.log(err);
        console.log('error occured');
        reject();
      })
      .on('end', async () => {
        const planetsCount = (await getAllPlanets()).length;
        console.log(`Found ${planetsCount} habitable planets!`);
        resolve();
      });
  });
}

async function getAllPlanets() {
  return await planets.find({}, { '__v': 0, '_id': 0 });
}

async function savePlanet(planet) {
  //insert + update = upsert
  //only insert if object doesn't exist already
  try {
    await planets.updateOne(
      { keplerName: planet.kepler_name }, //look for documents that match this name (filter)
      { keplerName: planet.kepler_name }, //if upsert = true, then update with this data if none found in filter
      { upsert: true } //upsert = true
    );
  } catch (err) {
    console.error(`Could not save planet: ${err}`);
  }
}

module.exports = {
  loadPlanetsData,
  getAllPlanets,
};