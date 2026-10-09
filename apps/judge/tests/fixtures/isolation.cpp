#include <iostream>
#include <fstream>
#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <sys/mount.h>
#include <sched.h>
int main(){
  if(getuid()!=65534 || setuid(0)==0) return 1;
  std::ofstream f("/etc/arena-probe"); if(f.good()) return 2;
  if(mount("none","/tmp","tmpfs",0,nullptr)==0) return 3;
  if(unshare(CLONE_NEWUSER)==0) return 4;
  int s=socket(AF_INET,SOCK_STREAM,0); sockaddr_in a{}; a.sin_family=AF_INET;a.sin_port=htons(80);inet_pton(AF_INET,"1.1.1.1",&a.sin_addr);
  if(connect(s,(sockaddr*)&a,sizeof(a))==0) return 5;
  std::ifstream input("/app/input.txt"), source("/work/solution.cpp");
  if(input.good() || source.good()) return 6;
  std::cout<<"isolated";
}
