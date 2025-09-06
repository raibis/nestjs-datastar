import {
  RequestMethod,
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

import {
  METHOD_METADATA,
  PATH_METADATA,
  SSE_METADATA,
} from '@nestjs/common/constants';

import { Request } from 'express';

function createDatastarMethodDecorator(method: RequestMethod) {
  return (path?: string): MethodDecorator => {
    return (
      target: object,
      key: string | symbol,
      descriptor: TypedPropertyDescriptor<any>,
    ) => {
      path = path && path.length ? path : '/';
      Reflect.defineMetadata(PATH_METADATA, path, descriptor.value as object);
      Reflect.defineMetadata(
        METHOD_METADATA,
        method,
        descriptor.value as object,
      );
      Reflect.defineMetadata(SSE_METADATA, true, descriptor.value as object);
      return descriptor;
    };
  };
}

export const GetDS = createDatastarMethodDecorator(RequestMethod.GET);
export const PostDS = createDatastarMethodDecorator(RequestMethod.POST);
export const PatchDS = createDatastarMethodDecorator(RequestMethod.PATCH);
export const PutDS = createDatastarMethodDecorator(RequestMethod.PUT);
export const DeleteDS = createDatastarMethodDecorator(RequestMethod.DELETE);

export const SignalsDS = createParamDecorator(
  <T = any>(data: unknown, ctx: ExecutionContext): T => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const method = request.method?.toUpperCase();
    try {
      if (method === 'GET') {
        const datastar = request.query?.datastar;
        if (!datastar) {
          return {} as T;
        }
        // Handle both string and array cases (in case of multiple datastar params)
        const datastartValue = Array.isArray(datastar) ? datastar[0] : datastar;
        if (typeof datastartValue !== 'string') {
          throw new BadRequestException('Invalid datastar parameter format');
        }
        const decoded = decodeURIComponent(datastartValue);
        return JSON.parse(decoded) as T;
      }
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
        return (request.body ?? {}) as T;
      }
      return {} as T;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new BadRequestException(
          'Invalid JSON format in datastar parameter',
        );
      }
      throw new BadRequestException('Failed to parse datastar format');
    }
  },
);
