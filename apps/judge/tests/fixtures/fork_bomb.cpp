#include <unistd.h>
int main(){for(;;){int pid=fork();if(pid==0)for(;;)pause();}}
