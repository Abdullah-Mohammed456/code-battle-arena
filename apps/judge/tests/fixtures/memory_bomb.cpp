#include <cstring>
int main(){for(;;){char* p=new char[4*1024*1024];std::memset(p,1,4*1024*1024);asm volatile("" : : "r"(p) : "memory");}}
