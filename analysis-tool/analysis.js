var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var fs = require("fs");
var recursive = require('recursive-readdir');
var NumberOfLinesThreshold = 100;
var BigOhThreshold = 3;
var MaxConditionsThreshold = 8;
var totalViolations = 0;
var _ = require("underscore");

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		//args = ["/var/lib/jenkins/workspace/checkbox.io/server-side/"];
		args = ["analysis.js"];
	}
	//complexity("/Users/PranavKulkarni/Documents/DevOps/checkbox.io/server-side/site/routes/study.js")
	var dirPath = args[0];
	complexity(args[0]);
	/*recursive(dirPath, ['*.jade', '*.json', '*.html'], function (err, allFiles) {

		var files = [];

		for(var id in allFiles) {
  			if(allFiles[id].endsWith('.js')) {
  				var filePath = allFiles[id];
  				files.push(filePath);
  			}
  		}

  		finished = _.after(files.length, report);
  		for(var file in files) {
  			//complexity(filePath);
  		}
  		
	});
*/
	report();
}

function report() {
	// Report
	for( var node in builders )
	{
		var builder = builders[node];
		builder.report();
	}

	if(totalViolations > 0) {
		console.log("Total function violations = " + totalViolations);
	} else {
		console.log("No code violations found.");
	}
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



function complexity(filePath)
{	
	var buf = fs.readFileSync(filePath, "utf8");
	var ast = esprima.parse(buf, options);
	var i = 0;

	// A file level-builder:
	var fileBuilder = new FileBuilder();
	fileBuilder.FileName = filePath;
	builders[filePath] = fileBuilder;

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
			builder.BigOh = findSequenceLength(levels, findIndex(levels));

			if(isViolation(builder)) {
				builders[builder.FunctionName] = builder;
			}
		}
		
	});
}

function isViolation(functionBuilder) {
	if(functionBuilder.NumberOfLines > NumberOfLinesThreshold || functionBuilder.MaxConditions > MaxConditionsThreshold
		|| functionBuilder.BigOh > BigOhThreshold) {
		totalViolations++;
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

function findIndex(input){
	var len = input.length;
	var maxSeqEndingHere = _.range(len).map(function(){return 1;});
	for(var i=0; i<len; i++)
		for(var j=i-1;j>=0;j--)
			if(input[i] > input[j] && maxSeqEndingHere[j] >= maxSeqEndingHere[i])
				maxSeqEndingHere[i] = maxSeqEndingHere[j]+1;
	return maxSeqEndingHere;
}
 
function findSequenceLength(input, result){
	if(input.length === 0) {
		return 0;
	}
	var maxValue = Math.max.apply(null, result);
	var maxIndex = result.indexOf(Math.max.apply(Math, result));
	var output = [];
	output.push(input[maxIndex]);
	for(var i = maxIndex ; i >= 0; i--){
		if(maxValue==0)break;
		if(input[maxIndex] > input[i]  && result[i] == maxValue-1){
			output.push(input[i]);
			maxValue--;
		}
	}
	output.reverse();
	return output.length;
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
 