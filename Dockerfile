FROM gcc:16@sha256:17043c23ec2ad97fc3beca18da77275d26be5db5cd70ea0a5d73200e21a8e999

RUN find / -xdev -type f -perm /6000 -exec chmod a-s {} + \
    && rm -f /usr/bin/curl /usr/bin/wget /usr/bin/git /usr/bin/ssh /usr/bin/apt /usr/bin/apt-get
WORKDIR /work
USER 65534:65534
