export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
      NT_HOME: string;
      // add more environment variables and their types here
    }
  }
}
