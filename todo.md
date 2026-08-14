# Follow-up: unsupported file flow

- [x] Reproduce the reported image/unsupported-file upload flow on the published site.
- [x] Move the unsupported-file decision notice into the immediate upload surface and focus it when shown.
- [x] Make the accepted CSV, TSV, and TXT formats more explicit before selection.
- [x] Verify desktop image rejection inside the upload surface and review the mobile layout after the change.

The desktop test dispatched a local `sample.png` drop into the upload surface. The app showed the rejection card immediately inside that surface, stated that nothing was uploaded or analysed, and offered a compatible-file action. The mobile upload layout was also reviewed after the change.
