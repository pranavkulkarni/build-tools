package com.buildtools.autocommitgenerator;

import org.eclipse.jgit.api.Git;

import org.eclipse.jgit.api.ResetCommand.ResetType;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;

import com.buildtools.fuzzer.TestFuzzer.SourceCodeFuzzer;

import java.io.File;
import java.io.FileWriter;

public class AutoCommitter {
	private final static String LOCAL_REPO_PATH = "/var/lib/jenkins/workspace/iTrust-v23/.git";
	//private final static String LOCAL_REPO_PATH = "/Users/PranavKulkarni/Documents/DevOps/iTrust-v23/.git";
	//private final static String[] LOCAL_WORKSPACE_PATH = {"/Users/PranavKulkarni/Documents/DevOps/iTrust-v23/iTrust/src/main/edu/ncsu/csc/itrust/"};
	private final static String[] LOCAL_WORKSPACE_PATH = {"/var/lib/jenkins/workspace/iTrust-v23/iTrust/src/main/edu/ncsu/csc/itrust/"};
	private static int BUILD_NO = 1; // also known as iteration no. 
	private static int JOB_POLL_TIME = 15000;
	private final static String REPORTS_PATH = "/var/lib/jenkins/build-tools/useless-test-detector/reports/builds/";
	private final static int MAX_BUILDS = 3;
	private final static String MASTER_BRANCH_NAME = "master";
	private final static String TESTCASES_BRANCH_NAME = "testcases";
	
	
	public static void main(String[] args) throws Exception {
		
		// Provide Path to existing Local Repo
        File repoDir = new File(LOCAL_REPO_PATH);
        FileRepositoryBuilder builder = new FileRepositoryBuilder();
        // scan environment GIT_* variables and scan up the file system tree
        Repository repository = builder.setGitDir(repoDir).readEnvironment().findGitDir().build();
        
        System.out.println("\nBuild-Tools | Test Fuzzer & Auto-commit Generator : STARTED");
        System.out.println("Performing Fuzzing & Auto-commits for " + MAX_BUILDS + " Builds\n");
        
        System.out.println("Local Repository Path : " + repository.getDirectory());
        Git git = new Git(repository);
        
        git.branchCreate().setName(TESTCASES_BRANCH_NAME).call();
        git.checkout().setName(TESTCASES_BRANCH_NAME).call();
        
        while(BUILD_NO <= MAX_BUILDS) {
 
        	System.out.println("\nTest Fuzzer & Auto-commit Generator Started for Build No: " + BUILD_NO);
        	
        	//Call the Fuzzer for source code modifications
    	    SourceCodeFuzzer.main(LOCAL_WORKSPACE_PATH);

            git.add().addFilepattern(".").call();	
            git.commit().setMessage("Auto-committer commit " + BUILD_NO).call();
            
            
            do {
            	//System.out.println("Waiting for iTrust-v23-testcases job " + JOB_NO + " to complete.");
            	Thread.sleep(JOB_POLL_TIME);
            } while(!(new File(REPORTS_PATH + BUILD_NO).exists()));
            
            //Thread.sleep(1000);
           
            git.reset().setMode(ResetType.HARD).setRef("HEAD~1").call();
      
          	System.out.println("Test Fuzzer & Auto-commit Generator Completed for Build No: " + BUILD_NO);
            BUILD_NO++;
        }
        
        git.checkout().setName(MASTER_BRANCH_NAME).call();
        git.branchDelete().setForce(true).setBranchNames(TESTCASES_BRANCH_NAME).call();

        git.close();
        
    	System.out.println("\nBuild-Tools | Test Fuzzer & Auto-commit Generator : COMPLETED\n");
    	
    }
}
