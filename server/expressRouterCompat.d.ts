import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Router {
    handle(req: any, res: any, next: any): any;
  }
}

export {};
