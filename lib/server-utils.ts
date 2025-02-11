import { NextResponse } from "next/server";
import { PrismaClientKnownRequestError, PrismaClientValidationError } from "@prisma/client/runtime/library";

export async function catchGeneric(error: unknown) {
  console.error(error)
  if (error instanceof PrismaClientValidationError) {
    return NextResponse.json({ message: `The provided payload is incorrect!`, error: error.message }, { status: 400 })
  }
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json({ message: "The requested resource has duplicate identifier!", error: error.message }, { status: 400 });
      case 'P2014':
        return NextResponse.json({ message: `The provided id is incorrect! Field: ${error.meta!.target}`, error: error.message }, { status: 400 })
      case 'P2003':
        return NextResponse.json({ message: `The provided payload is incorrect! Field: ${error.meta!.target}`, error: error.message }, { status: 400 })
      case 'P2025':
        return NextResponse.json({ message: "The requested resource could not be found!", error: error.message }, { status: 404 })
      default: {
        return NextResponse.json({ message: "Something went wrong with this request, please try again later!", error: error.message }, { status: 404 });
      }
    }
  } else {
    return NextResponse.json({ message: "Something went wrong with this request, please try again later!", error: (error as Error).message }, { status: 500 });
  }
}