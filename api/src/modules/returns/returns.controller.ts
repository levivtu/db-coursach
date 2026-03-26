import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReturnsService } from './returns.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('returns')
export class ReturnsController {
  constructor(private returnsService: ReturnsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getAllReturns(@Req() req: AuthenticatedRequest) {
    const userId = req.user!.userId;
    return this.returnsService.findAllByUserId(userId);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  getAllReturnsForEmployee(@Req() req: AuthenticatedRequest) {
    // Check if user is an employee
    const userRole = req.user!.userRole;
    if (userRole !== 'employee') {
      throw new Error(
        `Only employees can access all returns. Current role: ${userRole}`,
      );
    }
    return this.returnsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getReturnById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = req.user!.userId;
    return this.returnsService.findById(Number(id), userId);
  }

  @Get(':id/employee')
  @UseGuards(JwtAuthGuard)
  getReturnByIdForEmployee(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    // Check if user is an employee
    const userRole = req.user!.userRole;
    if (userRole !== 'employee') {
      throw new Error(
        `Only employees can access this endpoint. Current role: ${userRole}`,
      );
    }
    return this.returnsService.findByIdForEmployee(Number(id));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createReturn(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const userId = req.user!.userId;
    const { orderId, reason, bookIds, amounts } = body;
    return this.returnsService.create(
      userId,
      orderId,
      reason,
      bookIds,
      amounts,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteReturn(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = req.user!.userId;
    return this.returnsService.delete(Number(id), userId);
  }
}
