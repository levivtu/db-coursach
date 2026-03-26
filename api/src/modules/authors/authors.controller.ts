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
import { AuthorsService } from './authors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('authors')
export class AuthorsController {
  constructor(private authorsService: AuthorsService) {}

  @Get()
  getAllAuthors() {
    return this.authorsService.findAll();
  }

  @Get(':id')
  getAuthorById(@Param('id') id: string) {
    return this.authorsService.findById(Number(id));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createAuthor(@Req() req: AuthenticatedRequest, @Body() body: any) {
    // Check if user is an employee
    const userRole = req.user!.userRole;
    if (userRole !== 'employee') {
      throw new Error('Only employees can create authors');
    }
    return this.authorsService.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  updateAuthor(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    // Check if user is an employee
    const userRole = req.user!.userRole;
    if (userRole !== 'employee') {
      throw new Error('Only employees can update authors');
    }
    return this.authorsService.update(Number(id), body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteAuthor(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    // Check if user is an employee
    const userRole = req.user!.userRole;
    if (userRole !== 'employee') {
      throw new Error('Only employees can delete authors');
    }
    return this.authorsService.delete(Number(id));
  }
}
