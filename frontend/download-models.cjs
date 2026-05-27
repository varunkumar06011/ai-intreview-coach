const fs = require('fs');
const https = require('https');
const path = require('path');

const baseUrl = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';
const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.weights',
  'face_expression_model-weights_manifest.json',
  'face_expression_model.weights'
];

const dest = path.join(__dirname, 'public', 'models');

models.forEach(model => {
  const file = fs.createWriteStream(path.join(dest, model));
  https.get(baseUrl + model, response => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${model}`);
    });
  }).on('error', err => {
    fs.unlink(path.join(dest, model));
    console.error(`Error downloading ${model}: ${err.message}`);
  });
});
