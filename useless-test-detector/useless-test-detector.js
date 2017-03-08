var fs = require('fs');
var recursive = require('recursive-readdir');
var async = require('async');
var reportsPath = "./reports/builds";
var testStats = {};


function report(){

	console.log('------------------------------------------------------------------------------\n');
	console.log('                             Useless Tests Report                             \n');
	console.log('------------------------------------------------------------------------------\n');
	
	var testsPassed=0, allTests=0;

	for( item in testStats ){

		if( testStats[item].failed == 0){
			var text = item.split(", ");
			var testsuite = text[0];
			var testcase = text[1];
			testsPassed++;

			console.log('TestSuite: '+ testsuite + '\t Testcase: '+ testcase );
		}
		
		allTests++;
	}

	console.log('\n\nFlaky Testcases : ' + testsPassed + '\t Total Testcases : ' + allTests +'\n');
	console.log('Build-Tools | Useless Test Detector : COMPLETED\n');
	
}

function processFile(testReport, callback) {

	callback(testReport);

}

function collectStats(testReport) {

	fs.readFile(testReport, function(err , data ){

	    var lines = data.toString().trim().split("\n");
		for (index in lines) {
			if(lines[index].length > 0){

				if(testStats.hasOwnProperty(lines[index])){

					if(testReport.indexOf('success') > -1){
						testStats[lines[index]].passed +=1;
			        }
			        else{
			            testStats[lines[index]].failed +=1;
			        }

				}else{
					testStats[lines[index]] = {};
					if(testReport.indexOf('success') > -1){
						testStats[lines[index]].passed =1;
						testStats[lines[index]].failed =0;
			        }
			        else{
			            testStats[lines[index]].failed =1;
			            testStats[lines[index]].passed =0;
			        }

				}

			}
		}

		calls.pop();
		if(calls.length === 0) {
			report();
		}

	});


}
console.log('\nBuild-Tools | Useless Test Detector : STARTED');
console.log("Identifying Flaky Tests in Test Suite using Build-Tools | Useless Test Detector\n");
var calls = [];
recursive(reportsPath, function (err, allFiles) {
	for(var id in allFiles) {
		var file = allFiles[id];
		if(file.endsWith('.txt')) {
    		//console.log('--------' + file + '-------------');
    		calls.push(1);
			processFile(file, collectStats);
    	}
    }
});
