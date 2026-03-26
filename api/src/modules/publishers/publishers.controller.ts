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
import { PublishersService } from './publishers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('publishers')
export class PublishersController {
  constructor(private publishersService: PublishersService) {}

  @Get()
  getAllPublishers() {
    return this.publishersService.findAll();
  }

  @Get(':id')
  getPublisherById(@Param('id') id: string) {
    return this.publishersService.findById(Number(id));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createPublisher(@Req() req: AuthenticatedRequest, @Body() body: any) {
    // Check if user is an employee
    const userRole = req.user!.userRole;
    if (userRole !== 'employee') {
      throw new Error('Only employees can create publishers');
    }
    return this.publishersService.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  updatePublisher(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    // Check if user is an employee
    const userRole = req.user!.userRole;
    if (userRole !== 'employee') {
      throw new Error('Only employees can update publishers');
    }
    return this.publishersService.update(Number(id), body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deletePublisher(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    // Check if user is an employee
    const userRole = req.user!.userRole;
    if (userRole !== 'employee') {
      throw new Error('Only employees can delete publishers');
    }
    return this.publishersService.delete(Number(id));
  }
}
