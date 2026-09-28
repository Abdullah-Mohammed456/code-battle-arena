# Sandbox image used by apps/api to compile and execute user-submitted C++.
# The API hardcodes the image name "cpp-runner", so build it as:
#   docker build -t cpp-runner .
FROM gcc:16

WORKDIR /app
