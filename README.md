
# Model Painter

## Overview

The purpose of this project is to create a way for users to color chainmail weaves the way they want so they have an idea of the options available to them.

## Adding models

Add the GLB to `models/`, then add its display name, editable subtitle, blog post URL, filenames, and ring count to `models/models.json`.

Run `npm run thumbnails` to generate every thumbnail, or `npm run thumbnails -- model_id` to generate one.

## Ring groups

While running `npm run dev`, open `/group-editor/model_id` to visually create and edit related-ring groups. Download the result and replace the matching `models/model_id.groups.json` sidecar. The authoring route is excluded from production builds.
