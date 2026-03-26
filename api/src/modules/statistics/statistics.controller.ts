import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { StatisticsService } from './statistics.service';
import type { Request } from 'express';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('sales-revenue')
  @UseGuards(JwtAuthGuard)
  async getTotalSalesRevenue(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<any> {
    // Check if user is an employee
    const userRole = (req as any).user?.userRole;
    if (userRole !== 'employee' && userRole !== 'admin') {
      throw new Error('Only employees can access this endpoint');
    }
    return this.statisticsService.getTotalSalesRevenue(startDate, endDate);
  }

  @Get('top-selling-books')
  @UseGuards(JwtAuthGuard)
  async getTopSellingBooks(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit: number = 10,
  ): Promise<any> {
    // Check if user is an employee
    const userRole = (req as any).user?.userRole;
    if (userRole !== 'employee' && userRole !== 'admin') {
      throw new Error('Only employees can access this endpoint');
    }
    return this.statisticsService.getTopSellingBooks(startDate, endDate, limit);
  }

  @Get('average-order-value')
  @UseGuards(JwtAuthGuard)
  async getAverageOrderValue(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<any> {
    // Check if user is an employee
    const userRole = (req as any).user?.userRole;
    if (userRole !== 'employee' && userRole !== 'admin') {
      throw new Error('Only employees can access this endpoint');
    }
    return this.statisticsService.getAverageOrderValue(startDate, endDate);
  }
}
