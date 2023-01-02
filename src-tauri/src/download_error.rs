use serde::Serialize;

use crate::ytd_rs::error::YoutubeDLError;

impl Serialize for YoutubeDLError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
