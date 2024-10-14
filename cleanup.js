const { rimraf } = require('rimraf');
const path = require('path');

// List of directories and files to remove
const directoriesToRemove = ['dist']

directoriesToRemove.forEach(dir => {
    const dirPath = path.join(__dirname, dir);

    rimraf(dirPath)
        .then(() => {
            console.log(`"${dirPath}" deleted.`);
        })
        .catch((err) => {
            console.error('Error while deleting the directory:', err);
        });
});
