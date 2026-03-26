import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller('carts')
export class CartsController {
  constructor(private cartsService: CartsService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyCart(@Req() req: Request) {
    const userId = req['user'].userId;
    return this.cartsService.findByUserId(userId);
  }

  @Post('add-book')
  @UseGuards(JwtAuthGuard)
  addBookToCart(@Req() req: Request, @Body() body: any) {
    const userId = req['user'].userId;
    const { bookId, amount } = body;
    return this.cartsService.addBookToCart(userId, bookId, amount);
  }

  @Post('remove-book')
  @UseGuards(JwtAuthGuard)
  removeBookFromCart(@Req() req: Request, @Body() body: any) {
    const userId = req['user'].userId;
    const { bookId, amount } = body;
    return this.cartsService.removeBookFromCart(userId, bookId, amount);
  }

  @Post('update-amount')
  @UseGuards(JwtAuthGuard)
  updateBookAmount(@Req() req: Request, @Body() body: any) {
    const userId = req['user'].userId;
    const { bookId, amount } = body;
    return this.cartsService.updateBookAmount(userId, bookId, amount);
  }

  @Post('clear')
  @UseGuards(JwtAuthGuard)
  clearCart(@Req() req: Request) {
    const userId = req['user'].userId;
    return this.cartsService.clearCart(userId);
  }
}
