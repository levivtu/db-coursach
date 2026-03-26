interface AuthenticatedRequest extends Express.Request {
  user?: {
    userId: number;
    userRole: string;
  };
}
