var fs = require('fs');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var recursive = require('recursive-readdir');

//var testReport =  '/Users/PranavKulkarni/Documents/DevOps/iTrust-v23/iTrust/target/surefire-reports/TEST-edu.ncsu.csc.itrust.unit.dao.fakeemail.EmailTest.xml';
var dirPath = '/Users/PranavKulkarni/Documents/DevOps/iTrust-v23/iTrust/target/surefire-reports/';

//var nextBuildNumberFile = '/var/lib/jenkins/jobs/iTrust-v23-secondary/nextBuildNumber'
//var buildDir = '/var/lib/jenkins/build-tools/reports/builds/';
var nextBuildNumberFile = '/Users/PranavKulkarni/Documents/DevOps/iTrust-v23/iTrust/target/nextBuildNumber';

var nextBuildNumber = fs.readFileSync(nextBuildNumberFile,"utf8").toString().trim();
//console.log(nextBuildNumber);

var buildDir = dirPath+"reports/builds/"+nextBuildNumber+"/";

// Create Directory for each Build
if (!fs.existsSync(buildDir)){
    fs.mkdirSync(buildDir);
}

// Parse sure-fire .xml Files 
recursive(dirPath, ['*.txt'], function (err, allFiles) {

    var files = [];

    for(var id in allFiles) {
        if(allFiles[id].endsWith('.xml')) {
            var testReport = allFiles[id];
            console.log(testReport);

            fs.readFile(testReport, function(err, data) {
                parser.parseString(data, function (err, result) {
                    var allTestCases = result.testsuite.testcase;
                    var failedTests = [];
                    var successfulTests = [];
                    
                    for(var i = 0; i < allTestCases.length; i++) {
                        if(allTestCases[i].failure) {
                            failedTests.push(allTestCases[i]);
                        } else {
                            successfulTests.push(allTestCases[i]);
                        }
                    }

                    console.log("-------------------- " + allTestCases[0].$.classname + " -------------------- ");
                    
                    console.log("#################### FAILED TESTS #########################\n");
                    for (var i = 0; i < failedTests.length; i++) {
                        console.log(failedTests[i].$.classname + ", " + failedTests[i].$.name + " Failed: TRUE" );

                        var failedFileName = buildDir + 'failed.txt';
                        var text = failedTests[i].$.classname + ", " + failedTests[i].$.name + "\n";

                        fs.appendFile(failedFileName, text, function (err) {
                           if (err) {
                              return console.error(err);
                           }
                        });

                    }

                    console.log("#################### SUCCESSFUL TESTS #########################\n");
                    for (var i = 0; i < successfulTests.length; i++) {
                        console.log(successfulTests[i].$.classname + ", " + successfulTests[i].$.name + " Failed: FALSE" );


                        var successFileName = buildDir + 'success.txt';
                        var text = successfulTests[i].$.classname + ", " + successfulTests[i].$.name + "\n";

                        fs.appendFile(successFileName, text, function (err) {
                           if (err) {
                              return console.error(err);
                           }
                        });
                    }
                    
                });
            });

        }
    }
});




