var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var fs = require("fs");
var recursive = require('recursive-readdir');
var NumberOfLinesThreshold = 50;
var BigOhThreshold = 3;
var MaxConditionsThreshold = 8;
var totalViolations = 0;
var _ = require("underscore");
var finished;

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		args = ["/var/lib/jenkins/workspace/checkbox.io/server-side/"];
	}
	//complexity("/Users/PranavKulkarni/Documents/DevOps/checkbox.io/server-side/site/routes/study.js")
	var dirPath = args[0];
	
	recursive(dirPath, ['*.jade', '*.json', '*.html'], function (err, allFiles) {

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
	// Number of strings in a file.
	this.Strings = 0;
	// Number of imports in a file.
	this.ImportCount = 0;

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

function complexity(filePath)
{	
	var buf = fs.readFileSync(filePath, "utf8");
	var ast = esprima.parse(buf, options);
	var i = 0;

	// A file level-builder:
	var fileBuilder = new FileBuilder();
	fileBuilder.FileName = filePath;
	fileBuilder.ImportCount = 0;
	builders[filePath] = fileBuilder;

	// Traverse program with a function visitor.
	traverseWithParents(ast, function (node) 
	{	
		// PackageComplexity:
		// require can be anywhere in the code, not necessarily a variable declaration
		if (node.type === "CallExpression")
		{
			if (node.callee.name === "require")
			{
				fileBuilder.ImportCount += 1; 
			}
		}
		//TODO : handle exports.createStudy
		if (node.type === 'FunctionDeclaration' || node.type === "FunctionExpression") 
		{	
			var builder = new FunctionBuilder();
			builder.FunctionName = functionName(node); 
			var maxConditions = 0;
			//builder.FunctionName = functionName(node); 
			builder.StartLine    = node.loc.start.line;
			builder.NumberOfLines   = node.loc.end.line - node.loc.start.line;

			//TODO: Big Oh calculation

			// MaxConditions: Here number of conditions in an if statement is the number of && and || + 1. You don't have to 
			// worry about !(not operation)
			builder.MaxConditions = 0; // for each function
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

			if(isViolation(builder)) {
				builders[builder.FunctionName] = builder;	
			}
		}
		finished();
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
 