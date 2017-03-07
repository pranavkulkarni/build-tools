var fs = require('fs');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var recursive = require('recursive-readdir');
var mkdirp = require('mkdirp');

var args = process.argv.slice(2);

if( args.length == 0 )
{
        //args = ["/var/lib/jenkins/workspace/iTrust-v23-secondary/iTrust/target/surefire-reports"];
        args = ["/Users/vivekanr/workspace/iTrust-v23/iTrust/target/surefire-reports/"];
}
   
var projectPath = args[0];
var reportsPath = "./reports/builds/"

var dirs = projectPath.split("/");
var jobName;
for(var i = 0 ; i < dirs.length; i++)
{
    if(dirs[i] === 'workspace'){
        jobName = dirs[i+1];
        break;
    }
}

//var nextBuildNumberFile = '/var/lib/jenkins/jobs/' + jobName + '/nextBuildNumber';
var nextBuildNumberFile = '/Users/vivekanr/workspace/' + jobName + '/iTrust/target/nextBuildNumber';
console.log(nextBuildNumberFile);

var nextBuildNumber = fs.readFileSync(nextBuildNumberFile, "utf8").toString().trim();
var buildDir = reportsPath + nextBuildNumber + "/";


// Create reports/builds directory    
mkdirp.sync(reportsPath, function (err) {
    if (err) console.error(err);
    else console.log('Could not create reports path!');
});

// Create Directory for each Build
if (!fs.existsSync(buildDir)){
    fs.mkdirSync(buildDir);
}

// Parse sure-fire .xml Files 
recursive(projectPath, ['*.txt'], function (err, allFiles) {

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



