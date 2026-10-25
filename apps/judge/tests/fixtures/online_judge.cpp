#include <iostream>

int main() {
#ifdef ONLINE_JUDGE
  std::cout << "judge";
#else
  return 1;
#endif
}
