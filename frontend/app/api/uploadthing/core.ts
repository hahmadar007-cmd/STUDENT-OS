import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { cookies } from "next/headers";

const f = createUploadthing();

const auth = async (req: Request) => {
  let token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get("token")?.value;
  }
  
  if (!token) return null;
  return { token };
};

export const ourFileRouter = {
  materialUploader: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    image: { maxFileSize: "16MB", maxFileCount: 1 },
    text: { maxFileSize: "16MB", maxFileCount: 1 },
    blob: { maxFileSize: "16MB", maxFileCount: 1 }
  })
    .middleware(async ({ req }) => {
      const user = await auth(req);
      if (!user) throw new UploadThingError("Unauthorized");
      return { token: user.token };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { 
        uploadedByToken: metadata.token, 
        url: file.url, 
        fileName: file.name, 
        size: file.size, 
        type: file.type 
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
