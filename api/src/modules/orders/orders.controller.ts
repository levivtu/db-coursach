import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getAllOrders(@Req() req: AuthenticatedRequest) {
    const userId = req.user!.userId;
    return this.ordersService.findAllByUserId(userId);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  getAllOrdersForEmployee(@Req() req: AuthenticatedRequest) {
    // Check if user is an employee
    const userRole = req.user!.userRole;
    console.log('Checking user role:', userRole); // Debug log
    if (userRole !== 'employee') {
      throw new Error(
        `Only employees can access all orders. Current role: ${userRole}`,
      );
    }
    return this.ordersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getOrderById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = req.user!.userId;
    return this.ordersService.findById(Number(id), userId);
  }

  @Get(':id/employee')
  @UseGuards(JwtAuthGuard)
  getOrderByIdForEmployee(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    // Check if user is an employee
    const userRole = req.user!.userRole;
    if (userRole !== 'employee') {
      throw new Error('Only employees can access this endpoint');
    }
    return this.ordersService.findByIdForEmployee(Number(id));
  }

  @Post('create-from-cart')
  @UseGuards(JwtAuthGuard)
  createOrderFromCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user!.userId;
    return this.ordersService.createOrderFromCart(userId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelOrder(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = req.user!.userId;
    return this.ordersService.cancelOrder(Number(id), userId);
  }
}
