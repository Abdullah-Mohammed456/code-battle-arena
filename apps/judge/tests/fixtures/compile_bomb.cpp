template<int N> struct T : T<N-1> {}; template<> struct T<0> {}; T<100000> x; int main(){}
