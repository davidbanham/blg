### This is a blogging tool.

* It runs purely in the browser.
* It saves posts to pouchDB
* If you like, you could replicate that db to other couches
* It renders markdown
* It allows inserting inline images
* It uploads the posts to S3
* It generates an index
* It provides navigation between posts
* It previews your index locally

Check it out:

[Posting Tool](http://davidbanham.github.io/blg)

[Example Site](https://microblog.davidbanham.com)

S3 configuration:

Your bucket will need a CORS configuration. It should look like this:

```
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>DELETE</AllowedMethod>
        <MaxAgeSeconds>3000</MaxAgeSeconds>
        <ExposeHeader>ETag</ExposeHeader>
        <AllowedHeader>*</AllowedHeader>
    </CORSRule>
</CORSConfiguration>
```

It will also need a bucket policy like this one:

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AddPerm",
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME_GOES_HERE/*"
    }
  ]
}
```

Have fun!