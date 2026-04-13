const KNOWN = ['maa','mummy','mom','mother','amma','papa','daddy','dad','father','nanna','bhai','bhaiya','brother','anna','didi','behen','sister','akka','chacha','uncle','mama','tau','chachi','aunty','mami','bua','dada','dadi','nana','nani','wife','husband','biwi','pati'];

export function isKnownContact(name: string) {
  return KNOWN.includes(name.toLowerCase().trim());
}

export function needsPin(amount: number, payee: string): boolean {
  if (isKnownContact(payee) && amount < 1000) return false;
  if (!isKnownContact(payee) && amount < 500) return false;
  return true;
}
