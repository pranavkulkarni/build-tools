var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var fs = require("fs");
var path = require("path");
var recursive = require('recursive-readdir');
var NumberOfLinesThreshold = 100;
var BigOhThreshold = 3;
var MaxConditionsThreshold = 8;
var calls = [];

//Ignore node_modules folder
function ignoreFunc(file,stats){
	return stats.isDirectory() && path.basename(file) == "node_modules";
}


function popStack(){
	calls.pop();
	if(calls.length === 0) {
		functionStats();
	}
}

function functionStats() {

	console.log('------------------------------------------------------------------------------\n');
	console.log('                        Static Code Analyzer Report                           \n');
	console.log('------------------------------------------------------------------------------\n');
	// Report
	for( var node in builders )
	{
		var builder = builders[node];
		builder.report();
	}

	var size = Object.keys(builders).length;

	if(size === 0) {
		console.log("No code violations found!");
	}

	console.log('\nBuild-Tools | Static Code Analyzer : COMPLETED\n');

}

function processFile(filePath, callback) {
	callback(filePath, popStack);
}

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		args = ["/var/lib/jenkins/workspace/checkbox.io/server-side/"];
		//args = ["/Users/PranavKulkarni/Documents/DevOps/checkbox.io/server-side/"];
		//args = ["analysis.js"];
	}

	console.log('\nBuild-Tools | Static Code Analyzer : STARTED');
	console.log(("Detecting Functions that violate Max Conditions (Threshold: {0}), Long Methods (Threshold: {1}), and Big-Oh (Threshold: {2})\n").format(MaxConditionsThreshold, NumberOfLinesThreshold, BigOhThreshold));
	
	var dirPath = args[0];
	recursive(dirPath, ['*.jade', '*.json', '*.html', ignoreFunc], function (err, allFiles) {

		for(var id in allFiles) {
  			if(allFiles[id].endsWith('.js')) {
  				var filePath = allFiles[id];
  				//console.log(filePath);
  				calls.push(1);
				processFile(filePath, complexity);

  			}
  		}
  		
	});

}

var builders = {};

// Represent a reusable "class" following the Builder pattern.
function FunctionBuilder()
{
	this.StartLine = 0;
	this.FunctionName = "";
	this.MaxConditions = 0;
	// Long method detection in terms of lines
	this.NumberOfLines = 0;
	// Big O of this function
	this.BigOh = 0;

	this.report = function()
	{
		console.log(
		   (
		   	"{0}(): {1}\n" +
		   	"============\n" +
			   "MaxConditions: {2}\t" +
				"NumberOfLines: {3}\t" +
				"BigOh: {4}\n\n"
			)
			.format(this.FunctionName, this.StartLine,
			        this.MaxConditions, this.NumberOfLines, this.BigOh)
		);
	}
};

// A builder for storing file level information.
function FileBuilder()
{
	this.FileName = "";
	this.report = function()
	{
		console.log (
			( "File: {0}\n" ).format( this.FileName ));
	}
}

// A function following the Visitor pattern.
// Annotates nodes with parent objects.
function traverseWithParents(object, visitor)
{
    var key, child;

    visitor.call(null, object);

    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null && key != 'parent') 
            {
            	child.parent = object;
				traverseWithParents(child, visitor);
            }
        }
    }

}


function traverseWithParents(object, visitor, level)
{
    var key, child;

    visitor.call(null, object);

    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null && key != 'parent') 
            {
            	child.parent = object;
            	child.level = level;
				traverseWithParents(child, visitor, level+1);
            }
        }
    }
}


function complexity(filePath, callback)
{	
	var buf = fs.readFile(filePath, function(err, buf) {
		var ast = esprima.parse(buf, options);

		// A file level-builder:
		var fileBuilder = new FileBuilder();
		fileBuilder.FileName = filePath;
		//builders[filePath] = fileBuilder;

		// Traverse program with a function visitor.
		traverseWithParents(ast, function (node) 
		{	
			if (node.type === 'FunctionDeclaration' || node.type === "FunctionExpression") 
			{	
				var builder = new FunctionBuilder();
				builder.FunctionName = functionName(node); 
				builder.StartLine    = node.loc.start.line;
				builder.NumberOfLines   = node.loc.end.line - node.loc.start.line;

				// MaxConditions: Here number of conditions in an if statement is the number of && and || + 1. You don't have to 
				// worry about !(not operation)
				traverseWithParents(node, function(child) {
					if(child.type === "IfStatement") {
						var conditionCount = 1; // default
						traverseWithParents(child.test, function(grandchild) {
							if(grandchild.type === "LogicalExpression") {
								conditionCount += 1;
							}
						});
						if(builder.MaxConditions < conditionCount) {
							builder.MaxConditions = conditionCount;
						}
					}
				});

				// BigOh calculation
				var levels = [];
				traverseWithParents(node, function(child) {
					if(isLoop(child)) {
						levels.push(child.level);
					};
				}, 1);
				builder.BigOh = longestIncreasingSubsequence(levels);

				if(isViolation(builder)) {
					builders[filePath] = fileBuilder;
					builders[builder.FunctionName] = builder;
				}
			}
		});

		callback();
		
	});
	

}

function isViolation(functionBuilder) {
	if(functionBuilder.NumberOfLines > NumberOfLinesThreshold || functionBuilder.MaxConditions > MaxConditionsThreshold
		|| functionBuilder.BigOh > BigOhThreshold) {
		return true;
	}
	return false;
}

// Helper function for counting children of node.
function childrenLength(node)
{
	var key, child;
	var count = 0;
	for (key in node) 
	{
		if (node.hasOwnProperty(key)) 
		{
			child = node[key];
			if (typeof child === 'object' && child !== null && key != 'parent') 
			{
				count++;
			}
		}
	}	
	return count;
}


// Helper function for checking if a node is a "decision type node"
function isDecision(node)
{
	if( node.type == 'IfStatement' || node.type == 'ForStatement' || node.type == 'WhileStatement' ||
		 node.type == 'ForInStatement' || node.type == 'DoWhileStatement')
	{
		return true;
	}
	return false;
}

function isLoop(node)
{
	if( node.type == 'ForStatement' || node.type == 'WhileStatement' ||
		 node.type == 'ForInStatement' || node.type == 'DoWhileStatement')
	{
		return true;
	}
	return false;
}

// Helper function for printing out function name.
function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	} 
	return "anon function @" + node.loc.start.line;
}

/******************************** LONGEST INCREASING SUBSEQUENCE  ********************************/

function longestIncreasingSubsequence(arr) {
    if(arr.length === 0) {
        return 0;
    }
    if(arr.length === 1) {
        return 1;
    }
    var longestSoFar = 0;
    for(var i = 1; i < arr.length; i++) {
        var count = 1;
        for(var j = i; j < arr.length; j++) {
            if(arr[j] > arr[j-1]) {
                count++;
            } else {
                if(count > longestSoFar) {
                    longestSoFar = count;
                }
                break;
            }
        }
        if(count > longestSoFar) {
            longestSoFar = count;
        }
    }
    return longestSoFar;
}

/******************************** LONGEST INCREASING SUBSEQUENCE  ********************************/

// Helper function for allowing parameterized formatting of strings.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

main();