package com.buildtools.fuzzer.TestFuzzer;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.VariableDeclarator;
import com.github.javaparser.ast.expr.BinaryExpr;
import com.github.javaparser.ast.expr.BinaryExpr.Operator;
import com.github.javaparser.ast.expr.Expression;
import com.github.javaparser.ast.expr.StringLiteralExpr;
import com.github.javaparser.ast.visitor.VoidVisitorAdapter;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;


import org.apache.commons.lang3.RandomStringUtils;

public class SourceCodeFuzzer {
	
	public final static int SEED = 100;
	public static int ignored, passed = 0;
	
	public  static boolean randomBoolean(float probability){
	    return Math.random() > probability;
		//return true;
	}
	
	public static void fuzz(File projectDir) {
    	
		new DirExplorer((level, path, file) -> path.endsWith(".java"), (level, path, file) -> {
        	
        	// ignore some files with random probability
			
        	if(randomBoolean(0.9f)) {
        		//System.out.println("----- Ignoring Fuzzing for file" + path);
        		ignored++;
        		return;
        	}
        	
        	passed++;
        	//System.out.println("----- Passing Fuzzing for file" + path);
            CompilationUnit cu = null;
			try {
				cu = JavaParser.parse(file);
			} catch (Exception e1) {
				e1.printStackTrace();
			}

            // prints the resulting compilation unit to default system output
            //System.out.println(Strings.repeat("=", path.length()));
            
            new VoidVisitorAdapter<Object>() {
            	
                @Override
                public void visit(BinaryExpr n, Object arg) {
                    super.visit(n, arg);
                    //System.out.println(" Original:  [L " + n.getBegin() + "] " + n );
                    
                    if(n.getOperator() == Operator.EQUALS) {
                		if(randomBoolean(0.25f)) {
                			n.setOperator(Operator.NOT_EQUALS);
                		}
                    }
                    
                    if(n.getOperator() == Operator.NOT_EQUALS) {
                		if(randomBoolean(0.15f)) {
                			n.setOperator(Operator.EQUALS);
                		}
                    }
                
                	if(n.getOperator() == Operator.OR) {
                		if(randomBoolean(0.25f)) {
                			n.setOperator(Operator.AND);
                		}
                    }
                	
                	if(n.getOperator() == Operator.AND) {
                		if(randomBoolean(0.22f)) {
                			n.setOperator(Operator.OR);
                		}
                    }
                
                	if(n.getOperator() == Operator.GREATER) {
                		if(randomBoolean(0.25f)) {
                			n.setOperator(Operator.LESS);
                		}
                    }
                	
                	if(n.getOperator() == Operator.LESS) {
                		if(randomBoolean(0.45f)) {
                			n.setOperator(Operator.GREATER);
                		}
                    }
                	
                	if(n.getOperator() == Operator.GREATER_EQUALS) {
                		if(randomBoolean(0.25f)) {
                			n.setOperator(Operator.LESS_EQUALS);
                		}
                    }
                	
                	if(n.getOperator() == Operator.LESS_EQUALS) {
                		if(randomBoolean(0.35f)) {
                			n.setOperator(Operator.GREATER_EQUALS);
                		}
                    }
                    
                    //System.out.println(" Modified:  [L " + n.getBegin() + "] " + n);
                }
                
                @Override
                public void visit(VariableDeclarator declarator, Object arg) {
                    super.visit(declarator, arg);
                    
                    Expression expression =null;
                    if( declarator.getInitializer().isPresent()) {
                    	expression = declarator.getInitializer().get();
                    	if (expression instanceof StringLiteralExpr) {
                        	//System.out.println(" Original:  [L " + declarator.getBegin() + "] " + declarator );
                        	
                        	String origValue = ((StringLiteralExpr) expression).getValue();
                        	String modifiedValue = RandomStringUtils.randomAlphabetic(origValue.length());
                        	if(randomBoolean(0.45f)) {
                        		((StringLiteralExpr) expression).setValue(modifiedValue);
                        	}
                        	//System.out.println(" Modified:  [L " + declarator.getBegin() + "] " + declarator );
                        }
                    }
           
                }
                
            }.visit(cu, null);
            
	            String fuzzedCode = cu.toString();
	            //System.out.println(fuzzedCode);
	            writeCompilationUnitToFile(file, fuzzedCode);
        }).explore(projectDir);
    }
    
    
    public static void writeCompilationUnitToFile(File file, String content) {
    	BufferedWriter bw = null;
		FileWriter fw = null;
		try {
			fw = new FileWriter(file);
			bw = new BufferedWriter(fw);
			bw.write(content);
			//System.out.println("File Writing Done.");
		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			try {
				if (bw != null)
					bw.close();
				if (fw != null)
					fw.close();
			} catch (IOException ex) {
				ex.printStackTrace();
			}
		}
	}

    public static void main(String[] args) {
    	String directory =null;
    	if(args.length == 0) {
    	 	directory = "/var/lib/jenkins/workspace/iTrust-v23/iTrust/src/main/edu/ncsu/csc/itrust/";
    		//directory = "/Users/PranavKulkarni/Documents/DevOps/iTrust-v23/iTrust/src/main/edu/ncsu/csc/itrust/";
    	}
    	else {
    		directory = args[0];
    	}
    	
        File projectDir = new File(directory);
        fuzz(projectDir);
        System.out.println("\tTest Fuzzer made " + passed + " file changes and ignored " + ignored + " files.");
        ignored = 0; passed = 0;
    }
}