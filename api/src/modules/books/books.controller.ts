import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) {}

  @Get()
  getAllBooks(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('authorId') authorId?: number,
    @Query('genreId') genreId?: number,
    @Query('publisherId') publisherId?: number,
  ) {
    return this.booksService.findAll({
      page: Number(page),
      limit: Number(limit),
      authorId: authorId ? Number(authorId) : undefined,
      genreId: genreId ? Number(genreId) : undefined,
      publisherId: publisherId ? Number(publisherId) : undefined,
    });
  }

  @Get(':id')
  getBookById(@Param('id') id: string) {
    return this.booksService.findById(Number(id));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createBook(@Body() body: any) {
    return this.booksService.create(body);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  updateBook(@Param('id') id: string, @Body() body: any) {
    return this.booksService.update(Number(id), body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteBook(@Param('id') id: string) {
    return this.booksService.delete(Number(id));
  }
}
