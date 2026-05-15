import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller()
export class RootController {
  @Get()
  root() {
    return {
      service: 'Qisma API',
      version: '1.0.0',
      status: 'running',
      docs: '/docs',
      health: '/v1/health',
    };
  }
}
