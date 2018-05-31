#!/usr/bin/env node

const path = require('path');
const program = require('commander');
const chalk = require('chalk');
const logger = require('./logger');
const fs = require('./utils/fileHelpers');
const {
  createReactComponent,
  createReactNativeComponent,
  createTypeScriptReactComponent,
  createTypeScriptReactNativeComponent,
  createReactComponentWithProps,
  createReactNativeComponentWithProps,
  createIndex,
  createIndexForFolders,
  createTest,
} = require('./data/componentData');
const format = require('./utils/format');
const clearConsole = require('./utils/clearConsole');
const stringHelper = require('./utils/stringHelper');
const checkVersion = require('./utils/checkVersion');
const { getComponentName, getComponentParentFolder } = require('./utils/componentsHelpers.js');
const removeNoneDir = require('./utils/removeNoneDir');
const isLetter = require('./utils/isLetter');

// Root directorys
const ROOT_DIR = process.cwd();
const PROJECT_ROOT_DIR = ROOT_DIR.substring(ROOT_DIR.lastIndexOf('/'), ROOT_DIR.length);

// Grab provided args
let [,,
  ...args] = process.argv;

// Set command line interface options for cli
program
  .version('0.1.0')
  .option('--typescript', 'Creates Typescript component and files')
  .option('--nocss', 'No css file')
  .option('--notest', 'No test file')
  .option('--reactnative', 'Creates React Native components')
  .option('--createindex', 'Creates index.js file for multple component imports')
  .option('-l, --less', 'Adds .less file to component')
  .option('-s, --sass', 'Adds .sass file to component')
  .option('-p, --proptypes', 'Adds prop-types to component')
  .option('-u, --uppercase', 'Component files start on uppercase letter')
  .parse(process.argv);
console.log(program);
// Remove options from args
if (args.length > 0) {
  const temp = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.charAt(0) !== '-') {
      temp.push(arg);
    }
  }

  args = temp;
}

/**
 * Creates files for component
 *
 * @param {String} componentName - Component name
 * @param {String} componentPath - File system path to component
 * @param {String|null} cssFileExt - css file extension (css, less, sass or null)
 */
function createFiles(componentName, componentPath, cssFileExt) {
  return new Promise((resolve) => {
    const isTypeScript = program.typescript;
    const isNative = program.reactnative;
    // File extension
    const ext = isTypeScript
      ? 'tsx'
      : 'js';
    const indexFile = `index.${ext}`;
    let name = componentName;
    // file names to create
    let files = [indexFile, `${name}.${ext}`];

    if (!program.notest) {
      files.push(`${name}.test.${ext}`);
    }

    // Add css | less | sass file if desired
    if (cssFileExt && !isNative) {
      files.push(`${name}.${cssFileExt}`);
    }

    if (program.uppercase) {
      name = stringHelper.capitalizeFirstLetter(name);

      files = files.map((file, i) => {
        if (i !== 0) {
          return stringHelper.capitalizeFirstLetter(file);
        }

        return file;
      });
    }

    // Create component folder
    fs
      .createDirectorys(componentPath)
      .then(() => {
        // Create index.js
        const promises = [];

        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          const filePath = path.join(componentPath, file);
          let data = '';

          if (file === indexFile) {
            data = createIndex(name, program.uppercase);
            promises.push(fs.writeFileAsync(filePath, isTypeScript ? data : format.formatPrettier(data)));
          } else if (file === `${name}.${ext}`) {
            if (isTypeScript) {
              data = isNative
                ? createTypeScriptReactNativeComponent(name)
                : createTypeScriptReactComponent(name);
            } else if (program.proptypes) {
              data = isNative
                ? createReactNativeComponentWithProps(name)
                : createReactComponentWithProps(name);
            } else {
              data = isNative ? createReactNativeComponent(name) : createReactComponent(name);
            }

            promises.push(fs.writeFileAsync(filePath, isTypeScript ? data : format.formatPrettier(data)));
          } else if (file.indexOf(`.test.${ext}`) > -1) {
            data = createTest(name, program.uppercase);

            if (!program.notest) {
              promises.push(fs.writeFileAsync(filePath, isTypeScript ? data : format.formatPrettier(data)));
            }
          } else if (file.indexOf('.css') > -1 || file.indexOf('.less') > -1 || file.indexOf('.scss') > -1) {
            data = '';
            promises.push(fs.writeFileAsync(filePath, format.formatPrettier(data)));
          }
        }

        Promise
          .all(promises)
          .then(() => resolve(files));
      })
      .catch((e) => {
        console.log(e);
        throw new Error('Error creating files');
      });
  });
}

/**
 * Creates index.js for multiple components imports.
 * import example when index.js has been created in root of
 * /components folder
 * - import { Component1, Component2 } from './components'
 *
 */
function createMultiIndex(folderPath) {
  fs
    .readDirAsync(ROOT_DIR)
    .then((folders) => {
      // Filter out items with none alphabetical first character
      folders = folders.filter(folder => isLetter(folder.charAt(0)));
      // Create data for index file
      data = createIndexForFolders(folders);
      const indexFilePath = path.join(folderPath, 'index.js');

      fs
        .writeFileAsync(indexFilePath, format.formatPrettier(data))
        .then(() => {
          logger.log();
          logger.animateStop();
          logger.log(`${chalk.cyan('Created index.js file at:')}`);
          logger.log(indexFilePath);
          logger.log();
          console.timeEnd('✨  Finished in');
          logger.done('Success!');
        })
        .catch(e => logger.warn('index.js already exists'));
    })
    .catch(e => logger.error(`Unable to get folder path or the folder is empty or already contain index.js`));
}

/**
 * Initializes create react component
 */
function initialize() {
  if (program.createindex === true) {
    createMultiIndex(componentPath);
    return;
  }

  if (args.length === 0) {
    logger.warn("You didn't supply component name as an argument.");
    logger.log('Please try "crcf componentName" or "create-react-component-folder componentName"');
  }

  // Start timer
  /* eslint-disable no-console */
  console.time('✨  Finished in');
  const promises = [];

  // Set component name, path and full path
  const componentPath = path.join(ROOT_DIR, args[0]);
  const componentFullPath = path.join(PROJECT_ROOT_DIR, componentPath);
  const folderPath = getComponentParentFolder(componentPath);

  if (args[0] === 'index') {
    logger.log();
    logger.warn('You cannot name your component index');
    logger.log();
    logger.log('Please choose a more descriptive name');
    logger.log();
  }
  // Check if folder exists
  fs
    .existsSyncAsync(componentPath)
    .then(() => {
      logger.animateStart('Creating components files...');

      let cssFileExt = 'css';

      if (program.less) {
        cssFileExt = 'less';
      }

      if (program.sass) {
        cssFileExt = 'scss';
      }

      if (program.nocss) {
        cssFileExt = null;
      }

      for (let i = 0; i < args.length; i += 1) {
        const name = getComponentName(args[i]);
        promises.push(createFiles(name, folderPath + name, cssFileExt));
      }

      return Promise.all(promises);
    })
    .then((filesArrData) => {
      logger.log(chalk.cyan('Created new React components at: '));

      for (let i = 0; i < filesArrData.length; i += 1) {
        const name = filesArrData[i][1];
        const filesArr = filesArrData[i];
        logger.log(folderPath + name.substring(0, name.lastIndexOf('.')));

        // Log files
        for (let j = 0; j < filesArr.length; j += 1) {
          logger.log(`  └─ ${filesArr[j]}`);
        }
      }

      logger.log();
      // Stop animating in console
      logger.animateStop();
      // Stop timer
      console.timeEnd('✨  Finished in');
      // Log output to console
      logger.done('Success!');
      // Check current package version
      // If newer version exists then print
      // update message for user
      checkVersion();
    })
    .catch((error) => {
      if (error.message === 'false') {
        logger.error(`Folder already exists at ..${componentFullPath}`);
        return;
      }

      logger.error(error);
    });
}

// Start script
initialize();
