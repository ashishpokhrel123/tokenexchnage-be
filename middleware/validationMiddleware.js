// import { Request, Response, NextFunction } from "express";
// import * as jio from "jio";

// interface MessageData {
//   message: string;
//   signature: string;
//   type: "request" | "response";
//   requestId?: string;
// }

// const schema = jio.Object().Keys({
//   message: jio.String().Min(1).Required(),
//   signature: jio
//     .String()
//     .Regex(/^[a-fA-F0-9]{32}$/)
//     .Required(),
//   type: jio.String().Valid("request", "response").Required(),
//   requestId: jio.When("type", "request", jio.String().Required()),
// });

// interface ValidatedRequest extends Request {
//   validatedData?: MessageData;
// }
// export const validationMiddleware = async (
//   req: ValidatedRequest,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   const data: MessageData = req.body;

//   const { error, value } = schema.Validate<MessageData>(data);

//   if (error) {
//     res.status(400).json({
//       success: false,
//       error: `Validation failed: ${error.message}`,
//     });
//     return;
//   }

//   req.validatedData = value;

//   next();
// };
