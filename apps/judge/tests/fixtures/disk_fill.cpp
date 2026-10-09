#include <cstdio>
int main(){char data[4096]{};FILE* f=std::fopen("/work/fill","w");if(!f)return 1;for(int i=0;i<8192;i++)if(std::fwrite(data,1,sizeof(data),f)!=sizeof(data))return 1;return std::fclose(f)==0?0:1;}
