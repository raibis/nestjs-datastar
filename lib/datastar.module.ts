import { DynamicModule, Module } from '@nestjs/common';
import { DatastarService, ViewEngine } from './datastar.service';

export interface DatastarModuleOptions {
  baseViewDir: string;
  viewEngine: ViewEngine;
  isDevelopment?: boolean;
}

@Module({})
export class DatastarModule {
  static forRoot(options: DatastarModuleOptions): DynamicModule {
    return {
      module: DatastarModule,
      providers: [
        { provide: 'DATASTAR_OPTIONS', useValue: options },
        DatastarService,
      ],
      exports: [DatastarService],
    };
  }
}
