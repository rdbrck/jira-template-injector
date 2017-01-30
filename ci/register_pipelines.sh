#!/bin/bash -e
~/fly -t rdbrck login --concourse-url https://concourse2.rdbrck.com/
~/fly -t rdbrck set-pipeline -c pipeline.yml -p jira-template-injector -l credentials.yml
