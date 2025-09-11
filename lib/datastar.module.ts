import { DynamicModule, Module } from '@nestjs/common';
import { DatastarService, ViewEngine } from './datastar.service';

export interface DatastarModuleOptions {
  global?: boolean;
  baseViewDir: string;
  viewEngine?: ViewEngine;
  isDevelopment?: boolean;
}

@Module({})
export class DatastarModule {
  static forRoot(options: DatastarModuleOptions): DynamicModule {
    return {
      module: DatastarModule,
      global: options.global ?? true,
      providers: [
        {
          provide: DatastarService,
          useFactory: () => new DatastarService(options),
        },
      ],
      exports: [DatastarService],
    };
  }
}
