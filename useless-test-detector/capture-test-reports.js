var fs = require('graceful-fs');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var recursive = require('recursive-readdir');
var mkdirp = require('mkdirp');

var args = process.argv.slice(2);

if( args.length == 0 )
{
        args = ["/var/lib/jenkins/workspace/iTrust-v23-testcases/iTrust/target/surefire-reports"];
        //args = ["/Users/PranavKulkarni/Downloads/synced/surefire-reports/"];
}
   
var projectPath = args[0];
var reportsPath = "./reports/builds/"

var dirs = projectPath.split("/");
var jobName;
for(var i = 0 ; i < dirs.length; i++)
{
    if(dirs[i] === 'workspace') {
        jobName = dirs[i+1];
        break;
    }
}

var passedTC= 0;
var failedTC=0;

var nextBuildNumberFile = '/var/lib/jenkins/jobs/' + jobName + '/nextBuildNumber';
//var nextBuildNumberFile = '/Users/PranavKulkarni/Downloads/synced/nextBuildNumber';
//console.log(nextBuildNumberFile);

var nextBuildNumber = parseInt(fs.readFileSync(nextBuildNumberFile, "utf8").toString().trim()) - 1;

var buildDir = reportsPath + nextBuildNumber + "/";

// Create reports/builds directory    
mkdirp.sync(reportsPath, function (err) {
    if (err) console.error(err);
    else console.log('Could not create Reports directory!');
});

// Create Directory for each Build
if (!fs.existsSync(buildDir)){
    fs.mkdirSync(buildDir);
}

function report(failedTestsCount, successfulTestsCount){
    var allTestCases = failedTestsCount + successfulTestsCount;
    console.log('Passed Testcases : ' + successfulTestsCount + '\t Failed/Error Testcases : ' + failedTestsCount + '\t Total Testcases : ' + allTestCases +'\n');
    console.log('Build-Tools | Useless Test Detector : COMPLETED\n');
}

function processFile(testReport, callback) {

    callback(testReport);

}

function collectStats(testReport) {

    fs.readFile(testReport, function(err, data) {

        var failedTests = {};
        var successfulTests = {};

        parser.parseString(data, function (err, result) {
            var allTestCases = result.testsuite.testcase;
            var failedTests = {};
            var successfulTests = {};
            
            for(var i = 0; i < allTestCases.length; i++) {
                if(allTestCases[i].$.classname.indexOf("edu.ncsu") == -1) {
                    //console.log("Ignoring..." + allTestCases[i].$.classname);
                    continue;
                }

                var key = allTestCases[i].$.classname + ", " + allTestCases[i].$.name + "\n";
                if(allTestCases[i].failure || allTestCases[i].error ) {
                    if(!failedTests.hasOwnProperty(key)) {
                        failedTests[key] = "";
                        failedTC++;
                    }
                } 
                else {
                    if(!successfulTests.hasOwnProperty(key)) {
                        successfulTests[key] = "";
                        passedTC++;
                    }
                }
            }

            //console.log("-------------------- " + allTestCases[0].$.classname + " -------------------- ");
            
            //console.log("#################### FAILED TESTS #########################\n");
            for (var failedTest in failedTests) {
                var failedFileName = buildDir + 'failed.txt';
                fs.appendFile(failedFileName, failedTest, function (err) {
                   if (err) {
                      return console.error(err);
                   }
                });
            }

            //console.log("#################### SUCCESSFUL TESTS #########################\n");
            for (var successfulTest in successfulTests) {
                var successfulFileName = buildDir + 'success.txt';
                fs.appendFile(successfulFileName, successfulTest, function (err) {
                   if (err) {
                      return console.error(err);
                   }
                });
            }
        
        });
        
        calls.pop();
        if(calls.length === 0) {
            report(failedTC, passedTC);
        }

    });

}

console.log('\nBuild-Tools | Useless Test Detector : STARTED\n');
console.log("Fetching SureFire Test Reports for Job: " + jobName + " Build No: " + nextBuildNumber);
var calls =[];
// Parse sure-fire .xml Files 
recursive(projectPath, ['*.txt'], function (err, allFiles) {

    var files = [];

    for(var id in allFiles) {
        if(allFiles[id].indexOf('.xml') > -1) {
            var testReport = allFiles[id];
            //console.log(testReport);

            calls.push(1);
            processFile(testReport, collectStats);

        }
    }
});
