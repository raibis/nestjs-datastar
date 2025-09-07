import { Controller, Get, MessageEvent, Render } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { PostDS, SignalsDS, DatastarService } from 'nestjs-datastar';

@Controller()
export class AppController {
  constructor(private readonly DS: DatastarService) {}

  @Get()
  @Render('index')
  index() {}

  @PostDS('merge')
  merge(@SignalsDS() signals: Record<string, any>): Observable<MessageEvent> {
    return from([
      this.DS.patchElementsTemplate('merge', { word: 'Labutis' }),
      this.DS.patchSignals(JSON.stringify({ foo: `${signals.foo} 24444` })),
    ]);
  }
}
